const axios = require("axios");
require("dotenv").config();
const base_url = "https://api.paystack.co";
const sec_key = process.env?.PAYSTACK_SEC_KEY;
class Paystack {
  static async getUrl({
    user_id,
    email,
    name,
    phone,
    transaction_reference,
    amount,
    currency,
    redirect_url,
  }) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sec_key}`,
      "Cache-Control": "no-cache",
    };
    console.log({ headers });

    const url = `${base_url}/transaction/initialize`;
    console.log({ url });
    const payload = JSON.stringify({
      email: email,
      amount: amount * 100,
      currency: currency,
      ref: transaction_reference,
      callback_url: redirect_url,
      metadata: {
        consumer_id: user_id,
        email: email,
        phonenumber: phone,
        name: name,
      },
    });

    try {
      const response = await axios.post(url, payload, { headers });
      if (response.data.status) {
        console.log("paystack response", response.data);
        return {
          status: true,
          message: response.data.message,
          payment_link: response.data.data.authorization_url,
          reference: response.data.data.reference,
          gateway: "paystack",
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          payment_link: "",
          reference: "",
          gateway: "paystack",
        };
      }
    } catch (e) {
      console.log({ e });
      return {
        status: false,
        message: e.message,
        payment_link: "",
        reference: "",
        gateway: "paystack",
      };
    }
  }

  static async verify(transaction_ref) {
    const url = `${base_url}/transaction/verify/${transaction_ref}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sec_key}`,
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.data.status) {
        const data = response.data.data;
        data.amount = data.amount / 100;
        return {
          status: true,
          message: response.data.message,
          transaction_info: data,
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          transaction_info: "",
        };
      }
    } catch (e) {
      return {
        status: false,
        message: e.message,
        transaction_info: "",
      };
    }
  }
}

module.exports = Paystack;
