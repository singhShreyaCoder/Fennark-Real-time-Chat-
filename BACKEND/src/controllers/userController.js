import User from "../models/user.js";

export async function searchUser(req, res) {
  try {
    const user = await User.find({
      username: { $regex: req.query.q, $options: "i" },
      _id: { $ne: req.user._id },
    }).select("username profilePicture");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in searchUser controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUserById(req, res) {
  try {
    const findUser = await User.findById(req.params.id).select(
      "username profilePicture",
    );

    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(findUser);
  } catch (error) {
    console.log("Error in getUserById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { username, profilePicture } = req.body;

    const updateUser = await User.findByIdAndUpdate(req.user._id);

    if (!updateUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res
          .status(400)
          .json({ message: "Username must be at least 3 characters" });
      }
      updateUser.username = username.trim();
    }

    if (profilePicture !== undefined) {
      if (typeof profilePicture !== "string") {
        return res
          .status(400)
          .json({ message: "Profile picture must be a string" });
      }
      updateUser.profilePicture = profilePicture;
    }

    await updateUser.save();

    res.status(200).json({
      message: "Profile updated successfully",
      updatedUser: {
        id: updateUser._id,
        username: updateUser.username,
        profilePicture: updateUser.profilePicture,
      },
    });
  } catch (error) {
    console.log("Error in updateUser controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMyProfile(req, res) {
  try {
    const myProfile = await User.findById(req.user._id).select(
      "username email profilePicture isOnline lastSeen",
    );

    if (!myProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "Profile fetched successfully", myProfile });
  } catch (error) {
    console.log("Error in getMyProfile controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMyAccount(req, res) {
  try {
    const deleteAccount = await User.findByIdAndDelete(req.user._id);

    if (!deleteAccount) {
      return res.status(404).json({ message: "User not found" });
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMyAccount controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAllUsers(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("username profilePicture isOnline lastSeen")
      .skip(skip)
      .limit(limit);

    return res
      .status(200)
      .json({ message: "Users fetched successfully", page, users });
  } catch (error) {
    console.log("Error in getAllUsers:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
