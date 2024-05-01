export type LinkTextParams = {
  preview_url: string;
  body: string;
};

export type TextParams = {
  preview_url: string;
  body: string;
};

export function LinkWidget(params: LinkTextParams): LinkTextParams {
  return params;
}

export function TextWidget(params: TextParams): TextParams {
  return params;
}
