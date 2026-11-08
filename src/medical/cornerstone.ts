let initialized: Promise<void> | undefined;
export async function initialize() {
  if (!initialized)
    initialized = (async () => {
      const core = await import("@cornerstonejs/core");
      const loader = await import("@cornerstonejs/dicom-image-loader");
      const tools = await import("@cornerstonejs/tools");
      await core.init();
      loader.init({ maxWebWorkers: 2 });
      await tools.init();
      for (const tool of [
        tools.WindowLevelTool,
        tools.PanTool,
        tools.ZoomTool,
        tools.StackScrollTool,
        tools.LengthTool,
        tools.AngleTool,
        tools.RectangleROITool,
        tools.EllipticalROITool,
        tools.ProbeTool,
      ])
        tools.addTool(tool);
    })();
  return initialized;
}
