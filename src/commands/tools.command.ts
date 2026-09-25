import { ToolsService } from "@/services/tools";

/**
 * Скачать sing-box и mihomo в каталог .tools
 */
export const runTools = async (): Promise<void> => {
  await new ToolsService().install();
};
