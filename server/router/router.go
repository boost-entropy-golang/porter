package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"
	mw "github.com/porter-dev/porter/server/router/middleware"
)

// New creates a new Chi router instance
func New(
	a *api.App,
	store sessions.Store,
	cookieName string,
	staticFilePath string,
	repo *repository.Repository,
) *chi.Mux {
	l := a.Logger()
	r := chi.NewRouter()
	auth := mw.NewAuth(store, cookieName, repo)

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.ContentTypeJSON)

		// /api/users routes
		r.Method("GET", "/users/{user_id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleReadUser, l), mw.URLParam))
		r.Method("POST", "/users", requestlog.NewHandler(a.HandleCreateUser, l))
		r.Method("DELETE", "/users/{user_id}", auth.DoesUserIDMatch(requestlog.NewHandler(a.HandleDeleteUser, l), mw.URLParam))
		r.Method("POST", "/login", requestlog.NewHandler(a.HandleLoginUser, l))
		r.Method("GET", "/auth/check", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleAuthCheck, l)))
		r.Method("POST", "/logout", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleLogoutUser, l)))

		// /api/projects routes
		r.Method(
			"GET",
			"/projects/{project_id}",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleReadProject, l),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method("POST", "/projects", auth.BasicAuthenticate(requestlog.NewHandler(a.HandleCreateProject, l)))

		r.Method(
			"POST",
			"/projects/{project_id}/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleCreateProjectSACandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/candidates",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleListProjectSACandidates, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/candidates/{candidate_id}/resolve",
			auth.DoesUserHaveProjectAccess(
				requestlog.NewHandler(a.HandleResolveSACandidateActions, l),
				mw.URLParam,
				mw.WriteAccess,
			),
		)

		// /api/projects/{project_id}/releases routes
		r.Method(
			"GET",
			"/projects/{project_id}/releases",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleListReleases, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/{revision}/components",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleGetReleaseComponents, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/history",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleListReleaseHistory, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/releases/{name}/upgrade",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleUpgradeRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"GET",
			"/projects/{project_id}/releases/{name}/{revision}",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleGetRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		r.Method(
			"POST",
			"/projects/{project_id}/releases/{name}/rollback",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleRollbackRelease, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)

		// /api/projects/{project_id}/k8s routes
		r.Method(
			"GET",
			"/projects/{project_id}/k8s/namespaces",
			auth.DoesUserHaveProjectAccess(
				auth.DoesUserHaveServiceAccountAccess(
					requestlog.NewHandler(a.HandleListNamespaces, l),
					mw.URLParam,
					mw.QueryParam,
				),
				mw.URLParam,
				mw.ReadAccess,
			),
		)
	})

	fs := http.FileServer(http.Dir(staticFilePath))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		if _, err := os.Stat(staticFilePath + r.RequestURI); os.IsNotExist(err) {
			http.StripPrefix(r.URL.Path, fs).ServeHTTP(w, r)
		} else {
			fs.ServeHTTP(w, r)
		}
	})

	return r
}
