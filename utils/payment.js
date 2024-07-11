exports.generatePaystackCheckoutLink = async function (email, amountInNaira) {
    const data = {
      email: email || "hello@centenum.com",
      amount: (amountInNaira * 100).toString(), // amount in kobo
    };

    const options = {
      url: "https://api.paystack.co/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      data,
    };

    const checkoutDetails = await axios(options)
      .then((response) => {
        return response.data.data;
      })
      .catch((error) => {
        throw new Error(error);
      });

    return checkoutDetails;
  }