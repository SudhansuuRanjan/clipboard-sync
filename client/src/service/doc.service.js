import supabase from "../config/supabase";

export const createSession = async (setSessionCode) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newCode = "";
    for (let i = 0; i < 5; i++) {
        newCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    await supabase.from("sessions").insert([{ code: newCode }]);

    setSessionCode(newCode);
    localStorage.setItem("sessionCode", newCode);
};