import axios from "axios";
import { TextWidget } from "./TextWidgetHandler";
require("dotenv").config();
import {
  MainMessagePayload,
  SendWhatsappMessageArguments,
  message_type,
  TextMessagePayload,
  InteractiveButtonsPayload,
  LinkTextParams,
  TextParams,
  InteractiveButtonsParams,
} from "../types/PayloadsToWhatsApp";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.DEV_TOKEN}`,
};

type FinalPayload = TextMessagePayload | InteractiveButtonsPayload;

export async function SendWhatsappMessage(args: SendWhatsappMessageArguments) {
  let payload: FinalPayload = determineMessagePaload(
    args.message_type,
    args.payload,
    args.receipent
  );

  const response = await axios.post(`${process.env.WEB_HOOK_DOMAIN}`, payload, {
    headers,
  });
  return response;
}

function determineMessagePaload(
  type: message_type,
  specificPayload: LinkTextParams | TextParams | InteractiveButtonsParams | any,
  receipent: string
): FinalPayload {
  let payload: FinalPayload;
  switch (type) {
    case "text":
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: receipent,
        type: type,
        text: specificPayload,
      };
      break;

    case "interactive":
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: receipent,
        type: "interactive",
        interactive: specificPayload,
      };
      break;
    default:
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: receipent,
        type: "text",
        text: specificPayload,
      };
  }

  return payload;
}
