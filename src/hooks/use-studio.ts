import { useEffect, useState } from "react";
import { loadStudio, saveStudio, type StudioState } from "@/lib/studio-data";
export function useStudio() {
  const [state, setState] = useState<StudioState>(loadStudio);
  useEffect(() => saveStudio(state), [state]);
  return { state, setState };
}
