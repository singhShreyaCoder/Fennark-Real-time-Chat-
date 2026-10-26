import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { generateToken } from "../utils/generateToken.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required" });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30 ||
      !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)
    ) {
      return res.status(400).json({
        message:
          "Username must be 3-30 characters and contain only letters, numbers or underscores",
      });
    }
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedEmail.length > 250
    ) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (password.length < 8 || password.length > 60) {
      return res
        .status(400)
        .json({ message: "Password must be between 8 and 60 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = generateToken(newUser._id.toString(), res);

    return res.status(200).json({
      message: "Registration successful",
      newUser: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profilePicture: newUser.profilePicture,
      },
    });
  } catch (error) {
    console.error("Error in registration controller", error.message);
    res.status(500).json({ message: "Internal server Error" });
  }
}


export async function login(req,res){
  try{
    const {email , password} = req.body;

  if(typeof email !== "string"||
    typeof password!== "string"
  ){
    return res.status(400).json({message:"Email and password are required"});
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({email:normalizedEmail}).select("+password")

  if(!user){
    return res.status(400).json({message:"Invalid credentials"});
  }

  const isPasswordCorrect = await bcrypt.compare(password , user.password);

  if(!isPasswordCorrect){
    return res.status(400).json({message:"Invalid credentials"});
  }
  generateToken(user._id,res);

  res.status(200).json({message:"Login successful",user:{
    id: user._id,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
  }});
  }catch(error){
    console.error("Error in login controller",error.message);
    res.status(500).json({message:"Internal server error"});
  }
}

export async function logout(req,res){
  try{
    res.cookie("jwt","",{maxAge:0});
    res.status(200).json({message:"Logged out successfully"});
  }catch(error){
    console.error("Error in logout controller",error.message);
    res.status(500).json({message:"Internal server error"});
  }
}
