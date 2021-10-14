import { useEffect } from "react";

export default function Poll(props) {
  useEffect(() => {
    if (!props.disabled) {
      if (props.poll) {
        props.stopPolling();
        setTimeout(() => {
          props.pollInvitations();
        }, 10000);
      }
    }
  });

  return null;
}
