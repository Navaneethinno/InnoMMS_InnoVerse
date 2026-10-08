// The portal's own Terms & Conditions and Privacy Policy, shown when the
// institution has not set its own addresses in branding (terms_url,
// privacy_url). {brand} is replaced with the institution's display name.
// A general template: the institution's legal team should review it.
export const LEGAL_UPDATED = "6 October 2026";

export const LEGAL = {
  terms: {
    title: "Terms & Conditions",
    intro: "These terms govern your use of the {brand} merchant portal. By signing in you agree to them.",
    sections: [
      { heading: "1. Your account", body: ["The portal is for merchants of {brand}. You are responsible for keeping your sign-in details, PIN and passwords secret, and for everything done with them.", "Tell {brand} straight away if you think someone else knows your PIN or password, or if your phone or card is lost or stolen."] },
      { heading: "2. Using the portal", body: ["Use the portal only for your own accounts and for lawful purposes. You must not try to get into another merchant's account, interfere with the service, or use it to commit fraud or money laundering.", "{brand} may limit or suspend access to protect you and the service, or where the law requires it."] },
      { heading: "3. Payments and limits", body: ["Payments you confirm with your transaction PIN are instructions to {brand} and may not be possible to reverse. Check the amount and the person you are paying before you confirm.", "Daily and monthly limits, fees and exchange rates apply as shown in the portal at the time of the payment."] },
      { heading: "4. Cards", body: ["Card actions such as blocking, unblocking, changing a card PIN or replacing a card are available as {brand} offers them. Keep your card and card PIN safe and never share them."] },
      { heading: "5. Information shown", body: ["Balances, statements and notifications are shown as recorded by {brand}. A balance may not include payments still being processed. If something looks wrong, contact {brand} promptly."] },
      { heading: "6. Availability", body: ["{brand} works to keep the portal available but cannot promise it will always be free of interruptions or errors, for example during maintenance or when your connection fails."] },
      { heading: "7. Liability", body: ["To the extent the law allows, {brand} is not liable for losses caused by events outside its reasonable control, or by you not keeping your sign-in details safe. Nothing here limits any right you have under the law."] },
      { heading: "8. Changes and contact", body: ["{brand} may update these terms. The date at the top shows the latest version, and continuing to use the portal means you accept it.", "For questions about these terms, contact {brand} using the contact details on its website or in the portal."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what {brand} collects through the merchant portal, why, and the choices you have.",
    sections: [
      { heading: "1. What we collect", body: ["Details you give us, such as your name, phone number, email address and identity information.", "Account and transaction information, such as balances, payments, card details and statements.", "Technical information, such as your device, browser, language and sign-in times, used to keep your account secure."] },
      { heading: "2. How we use it", body: ["To run your account, process your payments and show your balances and statements.", "To keep the portal secure, prevent fraud and meet legal duties such as identity checks.", "To send you notices about your account, such as payments, security alerts and statements."] },
      { heading: "3. How your sign-in details are protected", body: ["Your PIN and passwords are encrypted before they leave your device and are never shown back to you. Sessions end automatically after a period of inactivity."] },
      { heading: "4. Sharing", body: ["{brand} does not sell your information. It is shared only with service providers who help run your account, with other institutions to complete a payment you ask for, and with authorities where the law requires."] },
      { heading: "5. Keeping your information", body: ["Information is kept for as long as your account is open and as long afterwards as the law requires, then deleted or made anonymous."] },
      { heading: "6. Your choices", body: ["You can ask {brand} to show, correct or, where the law allows, delete the information it holds about you. You can also choose your language and how the portal looks."] },
      { heading: "7. Changes and contact", body: ["{brand} may update this policy. The date at the top shows the latest version.", "For privacy questions or requests, contact {brand} using the contact details on its website or in the portal."] },
    ],
  },
};
