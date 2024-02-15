export function getWalletNameFromOption(option: React.ReactNode) {
    if (option?.toString() === "wallet-connect") {
      return "Wallet Connect"
    }
    return option
  }