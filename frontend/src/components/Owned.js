import React, { Component } from "react";
import PropTypes from "prop-types";

// import "styles/Owned.scss";

/**
 * @desc eduSign component showing a list of signing invitations by the logged in user.
 *
 * @component
 */
class Owned extends Component {
  render() {
    return (
      <>
        {this.props.owned.map((doc, index) => {
          return (
            <>
              <div className="name-flex-item">{doc.name}</div>
              <div className="size-flex-item">{humanFileSize(doc.size)}</div>
              <div className="pending-invites">
                  {doc.pending.map((invite) => {
                    <span className="pending-invite">{invite}</span>
                  })}
              </div>
              <div className="signed-invites">
                  {doc.signed.map((invite) => {
                    <span className="signed-invite">{invite}</span>
                  })}
              </div>
            </>
          );
        })}
      </>
    );
  }
}

Owned.propTypes = {
  owned: PropTypes.array,
};

export default Owned;
