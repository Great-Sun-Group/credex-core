export type LinkTextParams = {
  preview_url: boolean;
  body: string;
};

export type TextParams = {
  preview_url: boolean;
  body: string;
};

export type message_type =
  | "Link"
  | "Previewed_Link"
  | "text"
  | "Button"
  | "Buttons"
  | "List"
  | "Form";

export type MessageChildPayload = LinkTextParams | TextParams;

export type SendWhatsappMessageArguments = {
  message: string;
  receipent: string;
  message_type: message_type;
  payload: MessageChildPayload;
};

export type MainMessagePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: string;
  text: MessageChildPayload;
};
