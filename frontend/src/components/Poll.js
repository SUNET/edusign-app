import { useEffect } from "react";

export default function Poll(props) {
  useEffect(() => {
    if (!props.disabled) {
      if (props.poll) {
        props.stopPolling();
        const timerId = setTimeout(() => {
          props.pollInvitations();
        }, 10000);
        props.setTimerId(timerId);
      }
    }
  });

  return null;
}
