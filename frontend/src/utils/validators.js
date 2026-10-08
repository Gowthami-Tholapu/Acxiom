export const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
export const PHONE_REGEX = /^\+?[\d\s\-()]{10,20}$/;

export function validateEmail(email) {
  if (!email || !email.trim()) return "Email address is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePhone(phone) {
  if (!phone || !phone.trim()) return "Phone number is required.";
  const clean = phone.replace(/[\s\-()+]/g, "");
  if (!/^\d+$/.test(clean) || clean.length < 10 || clean.length > 15) {
    return "Enter a valid phone number (10 to 15 digits).";
  }
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain at least one digit.";
  if (!/[!@#$%^&*(),.?":{}|<>_+\-=~`[\]\\/]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
}

export function validateOpportunity(amount, probability, closeDate, stage) {
  const errors = {};
  if (amount === undefined || amount === null || amount === "") {
    errors.amount = "Opportunity amount is required.";
  } else if (Number(amount) < 0) {
    errors.amount = "Opportunity Amount cannot be negative.";
  } else if (stage !== "Won" && stage !== "Lost" && Number(amount) <= 0) {
    errors.amount = "Opportunity Amount must be greater than 0.";
  }

  if (probability === undefined || probability === null || probability === "") {
    errors.probability = "Probability is required.";
  } else if (Number(probability) < 0 || Number(probability) > 100) {
    errors.probability = "Probability must be between 0 and 100.";
  }

  if (!closeDate) {
    errors.closeDate = "Expected Close Date is required.";
  } else if (stage !== "Won" && stage !== "Lost") {
    const today = new Date().toISOString().split("T")[0];
    if (closeDate < today) {
      errors.closeDate = "Expected Close Date cannot be in the past.";
    }
  }

  return errors;
}

export function validateFollowUp(followUpDate, status) {
  const errors = {};
  if (!followUpDate) {
    errors.followUpDate = "Follow-up date is required.";
  } else if (status === "Planned") {
    const today = new Date().toISOString().split("T")[0];
    const targetDate = followUpDate.split("T")[0];
    if (targetDate < today) {
      errors.followUpDate = "Follow-up date cannot be earlier than today.";
    }
  }
  return errors;
}
