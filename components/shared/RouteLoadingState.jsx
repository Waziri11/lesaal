import PageState from "./PageState";

export default function RouteLoadingState({ resourceLabel = "content" }) {
  return <PageState status="loading" resourceLabel={resourceLabel} />;
}
