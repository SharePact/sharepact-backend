const axios = require("axios");

const baseUrl = "https://api.flutterwave.com";
const secKey = process?.env?.FLUTTERWAVE_SEC_KEY;

class Flutterwave {
  static async getUrl({
    user_id,
    email,
    name,
    phone,
    transaction_reference,
    amount,
    currency,
    redirect_url,
    description = null,
  }) {
    if (!description) {
      description = "sharepact subscription payment";
    }

    const url = `${baseUrl}/v3/payments`;
    const headers = {
      Authorization: `Bearer ${secKey}`,
      "Content-Type": "application/json",
    };

    const payload = JSON.stringify({
      tx_ref: transaction_reference,
      amount: amount,
      currency: currency,
      redirect_url: redirect_url,
      payment_options: "",
      customer: {
        email: email,
        phonenumber: phone,
        name: name,
      },
      customizations: {
        title: "Sharepact",
        description: description,
        logo: "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724759036/SharePact_App_Group_5_harmdy.png",
      },
      meta: { consumer_id: user_id },
    });

    try {
      const response = await axios.post(url, payload, { headers });
      if (response.data.status === "success") {
        return {
          status: true,
          message: response.data.message,
          payment_link: response.data.data.link,
          reference: transaction_reference,
          gateway: "flutterwave",
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          payment_link: "",
          gateway: "flutterwave",
        };
      }
    } catch (error) {
      return {
        status: false,
        message: error.message,
        payment_link: "",
        gateway: "flutterwave",
      };
    }
  }

  static async verify(transaction_id) {
    const url = `${baseUrl}/v3/transactions/${transaction_id}/verify`;
    const headers = {
      Authorization: `Bearer ${secKey}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.data.status === "success") {
        return {
          status: true,
          message: response.data.message,
          transaction_info: response.data.data,
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          transaction_info: "",
        };
      }
    } catch (error) {
      return {
        status: false,
        message: error.message,
        transaction_info: "",
      };
    }
  }
}

module.exports = Flutterwave;
