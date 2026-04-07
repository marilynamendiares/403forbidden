import type React from "react";

export type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

export const mixBlendMultiply: React.CSSProperties["mixBlendMode"] = "multiply";
export const mixBlendOverlay: React.CSSProperties["mixBlendMode"] = "overlay";
export const mixBlendScreen: React.CSSProperties["mixBlendMode"] = "screen";
export const mixBlendNormal: React.CSSProperties["mixBlendMode"] = "normal";

export const verticalWritingMode: React.CSSProperties["writingMode"] = "vertical-rl";
export const mixedTextOrientation: React.CSSProperties["textOrientation"] = "mixed";
export const interWordJustify: React.CSSProperties["textJustify"] = "inter-word";
