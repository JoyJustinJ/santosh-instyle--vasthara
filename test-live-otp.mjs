const phone = "919999999999";
console.log("Sending OTP to:", phone);
const res = await fetch("https://www.mysanthosh.com/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
});
const text = await res.text();
console.log("Send OTP Response:", res.status, text);

const otp = "123456"; 
const verifyRes = await fetch("https://www.mysanthosh.com/api/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp })
});
const verifyText = await verifyRes.text();
console.log("Verify OTP Response:", verifyRes.status, verifyText);
