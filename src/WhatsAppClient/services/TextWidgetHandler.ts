export type LinkTextParams = {
  preview_url: boolean;
  body: string;
};

export type TextParams = {
  preview_url: boolean;
  body: string;
};

export function LinkWidget(params: LinkTextParams): LinkTextParams {
  return params;
}

export function TextWidget(params: TextParams): TextParams {
  return params;
}
