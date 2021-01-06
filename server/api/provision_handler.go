package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"

	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
)

// HandleProvisionTest will create a test resource by deploying a provisioner
// container pod
func (app *App) HandleProvisionTest(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// create a new agent
	agent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	_, err = agent.ProvisionTest(uint(projID))

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleProvisionAWSECRInfra provisions a new aws ECR instance for a project
func (app *App) HandleProvisionAWSECRInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateECRInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToAWSInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.AWSInfra.CreateAWSInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	awsInt, err := app.Repo.AWSIntegration.ReadAWSIntegration(infra.AWSIntegrationID)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	agent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	_, err = agent.ProvisionECR(
		uint(projID),
		awsInt,
		form.ECRName,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New aws ecr infra created: %d", infra.ID)

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleGetProvisioningLogs returns real-time logs of the provisioning process via websockets
func (app *App) HandleGetProvisioningLogs(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	kind := chi.URLParam(r, "kind")
	projectID := chi.URLParam(r, "project_id")
	infraID := chi.URLParam(r, "infra_id")

	streamName := fmt.Sprintf("%s-%s-%s", kind, projectID, infraID)

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	// upgrade to websocket.
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		app.handleErrorUpgradeWebsocket(err, w)
	}

	err = provisioner.ResourceStream(app.RedisClient, streamName, conn)

	if err != nil {
		app.handleErrorWebsocketWrite(err, w)
		return
	}
}