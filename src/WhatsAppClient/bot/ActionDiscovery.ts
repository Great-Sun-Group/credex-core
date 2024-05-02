import { SendMainMenu } from "./MainMenu";

const initializations = ["hi", "hey", "hello", "hie", "menu"];

type MessageReceived = {
  body: string;
  receipent: string;
};

export function ActionDiscovery(args: MessageReceived): void {
  if (initializations.includes(args.body)) {
    SendMainMenu(args.receipent);
  }
}
