import { useState } from "react";
import { pingClaude } from "../api/claude";

export function useConnectionTest() {
  const [status, setStatus]   = useState(null); // null | "testing" | "ok" | "fail"
  const [message, setMessage] = useState("");

  const run = async () => {
    setStatus("testing");
    setMessage("");
    try {
      const reply = await pingClaude();
      setStatus("ok");
      setMessage(`API reachable · model replied: "${reply.slice(0, 60)}"`);
    } catch (e) {
      setStatus("fail");
      setMessage(e.message);
    }
  };

  return { status, message, run };
}
