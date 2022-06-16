import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { ExpandedPorterTemplate } from "shared/types";
import { StacksLaunchContext } from "./Store";
import DynamicLink from "components/DynamicLink";
import styled from "styled-components";
import Heading from "components/form-components/Heading";
import TitleSection from "components/TitleSection";
import { hardcodedIcons } from "shared/hardcodedNameDict";

const DEFAULT_STACK_SOURCE_CONFIG_INDEX = 0;

const NewApp = () => {
  const { addAppResource, newStack } = useContext(StacksLaunchContext);
  const { currentCluster } = useContext(Context);

  const params = useParams<{
    template_name: string;
    version: string;
  }>();

  const [template, setTemplate] = useState<ExpandedPorterTemplate>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [saveButtonStatus, setSaveButtonStatus] = useState("");

  const [appName, setAppName] = useState("");

  const { pushFiltered } = useRouting();

  useEffect(() => {
    let isSubscribed = true;
    if (!params.template_name || !params.version) {
      return () => {
        isSubscribed = false;
      };
    }

    setHasError(false);

    api
      .getTemplateInfo<ExpandedPorterTemplate>(
        "<token>",
        {},
        { name: params.template_name, version: params.version }
      )
      .then((res) => {
        if (isSubscribed) {
          setTemplate(res.data);
        }
      })
      .catch((err) => {
        setHasError(true);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [params]);

  if (isLoading) {
    return <Wrapper><Loading /></Wrapper>;
  }

  if (hasError) {
    return <>Unexpected error</>;
  }

  const handleSubmit = async (rawValues: any) => {
    setSaveButtonStatus("loading");

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    const stackSourceConfig =
      newStack.source_configs[DEFAULT_STACK_SOURCE_CONFIG_INDEX];
    if (!stackSourceConfig) {
      return;
    }

    let url = stackSourceConfig.image_repo_uri;
    let tag = stackSourceConfig.image_tag;

    if (url?.includes(":")) {
      let splits = url.split(":");
      url = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = "latest";
    }

    if (!_.isEmpty(stackSourceConfig.build)) {
      if (template?.metadata?.name === "job") {
        url = "public.ecr.aws/o1j4x7p4/hello-porter-job";
        tag = "latest";
      } else {
        url = "public.ecr.aws/o1j4x7p4/hello-porter";
        tag = "latest";
      }
    }

    let provider;
    switch (currentCluster.service) {
      case "eks":
        provider = "aws";
        break;
      case "gke":
        provider = "gcp";
        break;
      case "doks":
        provider = "digitalocean";
        break;
      case "aks":
        provider = "azure";
        break;
      case "vke":
        provider = "vultr";
        break;
      default:
        provider = "";
    }

    // Check the server URL to see if we can detect the cluster provider.
    // There's no standard URL format for GCP that's why it's not currently included
    if (provider === "") {
      const server = currentCluster.server;

      if (server.includes("eks")) provider = "eks";
      else if (server.includes("ondigitalocean")) provider = "digitalocean";
      else if (server.includes("azmk8s")) provider = "azure";
      else if (server.includes("vultr")) provider = "vultr";
    }

    // don't overwrite for templates that already have a source (i.e. non-Docker templates)
    if (url && tag) {
      _.set(values, "image.repository", url);
      _.set(values, "image.tag", tag);
    }

    _.set(values, "ingress.provider", provider);

    // pause jobs automatically
    if (template?.metadata?.name == "job") {
      _.set(values, "paused", true);
    }

    if (appName === "") {
      setSaveButtonStatus("App name cannot be empty");
      return;
    }

    addAppResource({
      name: appName,
      source_config_name: newStack.source_configs[0]?.name || "",
      template_name: params.template_name,
      template_version: params.version,
      values,
    });

    setSaveButtonStatus("successful");
    setTimeout(() => {
      setSaveButtonStatus("");
      pushFiltered("/stacks/launch/overview", []);
    }, 1000);
  };

  return (
    <StyledLaunchFlow style={{ position: "relative" }}>
      <TitleSection>
        <DynamicLink to={`/stacks/launch/overview`}>
          <BackButton>
            <i className="material-icons">
              keyboard_backspace
            </i>
          </BackButton>
        </DynamicLink>
        <Polymer>
        <Icon src={hardcodedIcons[template.metadata.name]} />
        </Polymer>
        Add {template.metadata.name.charAt(0).toUpperCase() + template.metadata.name.slice(1)} to Stack
      </TitleSection>
      <Heading>Application Name <Required>*</Required></Heading>
      <InputRow
        type="string"
        value={appName}
        setValue={(val: string) => setAppName(val)}
        placeholder="ex: perspective-vortex"
        width="470px"
      />

      <div style={{ position: "relative" }}>
      <Heading>Application Settings</Heading>
      <Helper>Configure settings for this application.</Helper>
      <PorterFormWrapper
        formData={template.form}
        onSubmit={handleSubmit}
        isLaunch
        saveValuesStatus={saveButtonStatus}
        saveButtonText="Add Application"
      />
      </div>
    </StyledLaunchFlow>
  );
};

export default NewApp;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Wrapper = styled.div`
  margin-top: calc(50vh - 150px);
`;

const Icon = styled.img`
  width: 40px;
  margin-right: 14px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const BackButton = styled.div`
  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
    margin-right: 10px;
    padding: 3px;
    margin-left: 0px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Polymer = styled.div`
  margin-bottom: -6px;

  > i {
    color: #ffffff;
    font-size: 24px;
    margin-left: 5px;
    margin-right: 18px;
  }
`;

const StyledLaunchFlow = styled.div`
  min-width: 300px;
  width: calc(100% - 100px);
  margin-left: 50px;
  margin-top: ${(props: { disableMarginTop?: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
  padding-bottom: 150px;
`;