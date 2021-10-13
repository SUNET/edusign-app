import { useEffect } from "react";

export default function Poll(props) {
  useEffect(() => {
    if (props.poll) {
      props.stopPolling();
      setTimeout(() => {
        props.pollInvitations();
      }, 2000);
    }
  });

  return null;
}
