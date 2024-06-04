import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendMainMenu(receipent: string) {
  const menuText =
    "Hello Firstname/Businessname, welcome to your credex account. Here’s your dashboard in USD.\n\nSecured Balance: *$123.45*\nTotal Payables: *-$12.83*\nNet Pay/Rec: *$20.57*\n\nNet Credex Assets: *$144.02*";

  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "list",
    payload: {
      type: "list",
      // header: {},
      body: {
        text: menuText,
      },
      footer: {
        text: "",
      },
      action: {
        sections: [
          {
            title: "1. Notifications",
            rows: [
              {
                id: "notifications",
                title: "View Notifications",
                description: "",
              },
            ],
          },
          {
            title: "2. Transactions",
            rows: [
              {
                id: "transactions",
                title: "View Transactions",
                description: "",
              },
            ],
          },
          {
            title: "3. Offer Credex",
            rows: [
              {
                id: "offer_credex",
                title: "Offer a Credex",
                description: "",
              },
            ],
          },
          {
            title: "4. Switch Account",
            rows: [
              {
                id: "switch_account",
                title: "Switch Account",
                description: "",
              },
            ],
          },
          {
            title: "5. Settings",
            rows: [
              {
                id: "manage_settings_and_accounts",
                title: "Manage Settings",
                description: "",
              },
            ],
          },
        ],
        button: "Menu Options",
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
