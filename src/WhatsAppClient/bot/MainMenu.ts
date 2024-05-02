import {
  MessageChildPayload,
  SendWhatsappMessage,
  SendWhatsappMessageArguments,
} from "../services";

export function SendMainMenu(receipent: string) {
  const menuText = "Greetings";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: "https://zhouforexacademy.com",
  };
  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "Link",
    payload: innerChilderPayload,
  };
  SendWhatsappMessage(payload);
}
