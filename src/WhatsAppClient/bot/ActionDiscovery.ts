import { SendMainMenu } from "./MainMenu";
import { SendOnBoardingMainMenu } from "./OnBoardingMenu";
import { SendRequestForFirstName } from "./OnBoardingSteps";

const initializations = ["hi", "hey", "hello", "hie", "menu"];

type MessageReceived = {
  body: string;
  receipent: string;
};

export function ActionDiscovery(args: MessageReceived): void {
  const lowerCaseBody = args.body.toLowerCase();
  if (initializations.includes(lowerCaseBody)) {
    SendOnBoardingMainMenu(args.receipent);
  }
  if (lowerCaseBody === "new_account") {
    SendRequestForFirstName(args.receipent);
  }
}
