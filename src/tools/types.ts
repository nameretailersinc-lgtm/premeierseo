export type WidgetConfig = Record<string, string | number | boolean | string[] | null>;

export interface WidgetProps {
  toolId: string;
  config?: WidgetConfig;
}
