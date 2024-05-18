import { SendWhatsappMessage } from "../services";
import { SendWhatsappMessageArguments } from "../types/PayloadsToWhatsApp";

const MORE_ABOUT_CREDEX = `Today credex is being used for combi rides in Harare. Credex solves the problem of small
change. Riders charge their credex account with USD at a verified agent, and then use that
charge in any amount to pay for one ride at a time. When a combi accepts your credex, your
charge is transferred to their account, and they can cash it out at a registered agent.
There is no fee to charge your account, or to use that charge to pay for goods and services.
Combi drivers and owners can use the charge they’ve received to purchase goods and services
within the credex ecosystem, also at no charge. When an account charge is cashed out at a
registered agent, there is a 2% fee.`;

export function SendMoreAboutCredex(receipent: string) {
  const payload: SendWhatsappMessageArguments = {
    message: MORE_ABOUT_CREDEX,
    receipent: receipent,
    message_type: "interactive",
    payload: {
      type: "button",
      // header: {},
      body: {
        text: MORE_ABOUT_CREDEX,
      },
      footer: {
        text: "",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "hie",
              title: "Menu",
            },
          },
        ],
      },
    },
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response.data);
    });
}
