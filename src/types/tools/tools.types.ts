export interface IGithubRelease {
  tag_name?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
}

export type ToolName = "sing-box" | "mihomo";
