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
  | "list"
  | "Form"
  | "interactive";

// * Interactive buttons -----------------------------------------------------------------------------

type SingleReplyButton = {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
};

export type InteractiveButtonsParams = {
  type: "button";
  // header: {};
  body: {
    text: string;
  };
  footer: {
    text: string;
  };
  action: {
    buttons: SingleReplyButton[];
  };
};

export type InteractiveButtonsPayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: InteractiveButtonsParams;
};

// * Interactive lists -----------------------------------------------------------------------------

type SingleListButton = {
  title: string;
  rows: [
    {
      id: string;
      title: string;
      description: string;
    }
  ];
};

export type InteractiveListParams = {
  type: "list";
  // header: {};
  body: {
    text: string;
  };
  footer: {
    text: string;
  };
  action: {
    sections: SingleListButton[];
    button: string;
  };
};

export type InteractiveListPayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: InteractiveListParams;
};

// * End of Interactive lists -----------------------------------------------------------------------------

export type MessageChildPayload =
  | LinkTextParams
  | TextParams
  | InteractiveButtonsParams;

export type SendWhatsappMessageArguments = {
  message: string;
  receipent: string;
  message_type: message_type;
  payload:
    | LinkTextParams
    | TextParams
    | InteractiveButtonsParams
    | InteractiveListParams;
};

export type MainMessagePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: string;
  text: MessageChildPayload;
};

export type TextMessagePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: MessageChildPayload;
};
