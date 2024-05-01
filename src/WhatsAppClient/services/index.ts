import axios from "axios";
import {
  LinkTextParams,
  LinkWidget,
  TextParams,
  TextWidget,
} from "./TextWidgetHandler";

type message_type =
  | "Link"
  | "Previewed_Link"
  | "Text"
  | "Button"
  | "Buttons"
  | "List"
  | "Form";

type Payloads = LinkTextParams | TextParams;

type Arguments = {
  message: string;
  receipent: string;
  message_type: message_type;
  payload: Payloads;
};

type BasePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: string;
  text: Payloads;
};

export async function SendWhatsappMessage(args: Arguments) {
  let payload: BasePayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: args.receipent,
    type: args.message_type,
    text: determineMessagePaload(args.message_type, args.payload),
  };
  const response = await axios.post("", payload);
  return response;
}

function determineMessagePaload(
  type: message_type,
  specificPayload: Payloads
): Payloads {
  switch (type) {
    case "Link":
      return LinkWidget(specificPayload);
    default:
      return TextWidget(specificPayload);
  }
}
