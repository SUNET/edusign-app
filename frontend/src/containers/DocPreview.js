import { connect } from "react-redux";
import { updateIntl } from "react-intl-redux";

import DocPreview from "components/DocPreview";

const mapStateToProps = (state, props) => {
  return {
    documents: state.documents.documents,
  };
};

export default connect(mapStateToProps)(DocPreview);
