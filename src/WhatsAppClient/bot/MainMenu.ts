import {
  MessageChildPayload,
  SendWhatsappMessage,
  SendWhatsappMessageArguments,
} from "../services";

export function SendMainMenu(receipent: string) {
  const menuText = "http://zhouforexacademy.com";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: true,
  };
  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "text",
    payload: innerChilderPayload,
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response);
    });
}
