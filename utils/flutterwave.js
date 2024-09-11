const axios = require("axios");
require("dotenv").config();

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

  static async initTransfer({
    groupCreatorId,
    bankCode,
    accountNumber,
    amount,
    currency,
    reference,
    meta = {},
    narration = "",
  }) {
    if (!groupCreatorId) throw new Error("group creator id is required");

    const url = `${baseUrl}/v3/transfers`;
    const headers = {
      Authorization: `Bearer ${secKey}`,
      "Content-Type": "application/json",
    };

    if (narration == "")
      narration = `Transfer to Group Creator ${groupCreatorId}`;

    const payload = JSON.stringify({
      accountBank: bankCode,
      accountNumber,
      amount,
      currency,
      reference,
      meta,
      narration,
    });

    try {
      const response = await axios.post(url, payload, { headers });
      if (response.data.status === "success") {
        return {
          status: true,
          message: response.data.message,
          id: response.data.data.id,
          reference,
          gateway: "flutterwave",
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          id: "",
          reference,
          gateway: "flutterwave",
        };
      }
    } catch (error) {
      return {
        status: false,
        message: error.message,
        id: "",
        reference,
        gateway: "flutterwave",
      };
    }
  }

  static async fetchTransfer(id) {
    const url = `${baseUrl}/v3/transfers/${id}`;
    const headers = {
      Authorization: `Bearer ${secKey}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.data.status === "success") {
        return {
          status: response.data.data.status == "SUCCESSFUL",
          statusString: response.data.data.status,
          message: response.data.message,
          id: response.data.data.id,
          meta: response.data.data.meta,
          transaction_info: response.data.data,
        };
      } else {
        return {
          status: false,
          message: response.data.message,
          transaction_info: "",
          id: null,
          meta: null,
        };
      }
    } catch (error) {
      return {
        status: false,
        message: error.message,
        transaction_info: "",
        id: null,
        meta: null,
      };
    }
  }

  static async getBanks(countryCode = "NG") {
    const url = `${baseUrl}/v3/banks/${countryCode}`;
    const headers = {
      Authorization: `Bearer ${secKey}`,
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.data.status === "success") {
        return response.data.data;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }
}

// sample init transfer response
// {
//   "status": "success",
//   "message": "Transfer Queued Successfully",
//   "data": {
//     "id": 26251,
//     "account_number": "1234567840",
//     "bank_code": "044",
//     "full_name": "Flutterwave Developers",
//     "created_at": "2020-01-20T16:09:34.000Z",
//     "currency": "NGN",
//     "debit_currency": "NGN",
//     "amount": 5500,
//     "fee": 45,
//     "status": "NEW",
//     "reference": "akhlm-pstmnpyt-rfxx007_PMCKDU_1",
//     "meta": null,
//     "narration": "Akhlm Pstmn Trnsfr xx007",
//     "complete_message": "",
//     "requires_approval": 0,
//     "is_approved": 1,
//     "bank_name": "ACCESS BANK NIGERIA"
//   }
// }

//sample fetch transfer response
// {
//     "status": "success",
//     "message": "Transfer fetched",
//     "data": {
//         "id": 1933222,
//         "account_number": "0251238458",
//         "bank_code": "058",
//         "full_name": " Flutterwave Developers",
//         "created_at": "2020-06-11T00:36:20.000Z",
//         "currency": "NGN",
//         "debit_currency": "NGN",
//         "amount": 300,
//         "fee": 10.75,
//         "status": "SUCCESSFUL",
//         "reference": "new-actual-transfer-ref1",
//         "meta": null,
//         "narration": "Akhlm Pstmn Trnsfr xx007",
//         "approver": null,
//         "complete_message": "Transaction was successful",
//         "requires_approval": 0,
//         "is_approved": 1,
//         "bank_name": "GTBANK PLC"
//     }
// }

module.exports = Flutterwave;
