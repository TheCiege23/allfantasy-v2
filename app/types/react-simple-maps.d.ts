declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  export const ComposableMap: ComponentType<any>;
  export const Geography: ComponentType<any>;
  export const Marker: ComponentType<any>;
  export const ZoomableGroup: ComponentType<any>;

  export const Geographies: ComponentType<{
    geography?: any;
    children?: (args: { geographies: any[] }) => ReactNode;
    [key: string]: any;
  }>;
}
