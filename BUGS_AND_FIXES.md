# 🐛 Bugs & Fixes — Plain English Guide

This file documents every bug that was found in this backend, **what it did to the app**, **why it happened**, and **how it was fixed**. Written for beginners — no jargon assumed.

> **TL;DR:** Registration and login were completely broken, "get messages" always crashed,
> and profile updates crashed in some cases. After fixing 8 bugs, **all 30 endpoint tests pass.**

---

## 📋 Quick Overview

| #   | Where                                      | Symptom in the app                                                 | Severity                 |
| --- | ------------------------------------------ | ------------------------------------------------------------------ | ------------------------ |
| 1   | `authController.js` — register             | Every sign-up failed, even with valid data                         | 🔴 Broke sign-up         |
| 2   | `authController.js` — register             | Sign-up crashed with 500 after saving the user                     | 🔴 Broke sign-up         |
| 3   | `authController.js` — login                | Every login failed with "Email and password are required"          | 🔴 Broke login           |
| 4   | `authController.js` — login                | Login crashed with 500                                             | 🔴 Broke login           |
| 5   | `.env`                                     | JWT tokens couldn't be created; cookies insecure on localhost      | 🔴 Broke all auth        |
| 6   | `userController.js` — updateProfile        | Updating only your profile picture crashed                         | 🟠 Broke profile updates |
| 7   | `messageController.js` — getMessages       | Reading chat messages always crashed with 500                      | 🔴 Broke chats           |
| 8   | `messageController.js` — deleteForEveryone | Deleting an already-deleted message caused a double-response crash | 🟡 Edge case             |

---

## Bug 1 — The username check that rejected EVERYONE

### Where

`BACKEND/src/controllers/authController.js`, inside the `register` function.

### The buggy code

```js
if (
    !normalizedUsername.length < 3 || // 👈 this line
    normalizedUsername.length > 30 ||
    !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)
) {
    return res.status(400).json({
        message:
            "Username must be 3-30 characters and contain only letters, numbers or underscores",
    });
}
```

### What happened in the app

You could send a perfectly valid username like `"testuser"` and **still** get rejected:

```json
{
    "message": "Username must be 3-30 characters and contain only letters, numbers or underscores"
}
```

Nobody could ever register. ❌

### Why it happened (the tricky `!` rule)

JavaScript reads `!` **before** `<`. So the code did this step by step:

1. `normalizedUsername.length` → `8` (for "testuser")
2. `!8` → `false` (because `!` turns any non-zero number into `false`)
3. `false < 3` → JavaScript converts `false` to the number `0`
4. `0 < 3` → **`true`** 😱

So the "error" branch was **always** chosen, no matter what username you sent.

### The fix

```js
if (
  normalizedUsername.length < 3 ||    // ✅ just compare the length directly
  normalizedUsername.length > 30 ||
  !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)
) {
```

### 🎓 Lesson

`!` has very high priority in JavaScript. When checking a length, compare it directly —
never write `!something.length < 3`. If you need "less than 3", just write `< 3`.

---

## Bug 2 — Calling a function that doesn't exist

### Where

`authController.js`, end of the `register` function.

### The buggy code

```js
const token = generateToken(newUser._id.toString());

setAuthCookie(res, token); // 👈 setAuthCookie is not defined ANYWHERE
```

### What happened in the app

Sign-up would **save the user to the database**, then crash. The client got:

```json
{ "message": "Internal server Error" }
```

So the user was created, but the app _looked_ broken — and no login cookie was set.

### Why it happened

`setAuthCookie` was never imported or written. JavaScript throws a `ReferenceError`
("I don't know this name"), the `catch` block caught it, and replied with a generic 500.

### The fix

The `generateToken` utility **already sets the cookie itself** when you pass `res` to it.
So we just pass `res`:

```js
const token = generateToken(newUser._id.toString(), res); // ✅ cookie is set inside
```

### 🎓 Lesson

If a function isn't imported or defined in your file, it doesn't "magically exist".
Also check what your utility functions already do — this one already handled cookies.

---

## Bug 3 — `typeof` compared to the wrong thing (login never worked)

### Where

`authController.js`, inside the `login` function.

### The buggy code

```js
if (
    typeof email !== String || // 👈 "String" without quotes
    typeof password !== String
) {
    return res.status(400).json({ message: "Email and password are required" });
}
```

### What happened in the app

**Every login attempt failed**, even with correct email and password:

```json
{ "message": "Email and password are required" }
```

### Why it happened

This is a classic confusion between two different things:

- `typeof email` returns a **text string** like `"string"` (with quotes in the value)
- `String` (no quotes) is a **built-in function/object**

So the comparison was: `"string" !== String` → **always true**.
The error branch fired on every single request, before your real data was even looked at.

### The fix

```js
if (typeof email !== "string" ||      // ✅ quotes make it a text value
    typeof password !== "string") {
```

### 🎓 Lesson

`typeof` always gives you text: `"string"`, `"number"`, `"object"`, etc.
Always compare it with quotes: `typeof x === "string"`.

---

## Bug 4 — The password that wasn't there (login crashed with 500)

### Where

`authController.js`, inside `login`, right after Bug 3 was fixed.

### The buggy code

```js
const user = await User.findOne({ email: normalizedEmail });

const isPasswordCorrect = await bcrypt.compare(password, user.password); // 💥
```

### What happened in the app

Login returned:

```json
{ "message": "Internal server error" }
```

### Why it happened

Look at the User model (`models/user.js`):

```js
password: {
  type: String,
  required: true,
  select: false,   // 👈 "never include password in queries by default"
},
```

`select: false` is a **security feature** — it keeps the password out of query results
so it doesn't leak by accident. That means `user.password` was `undefined`,
and `bcrypt.compare("anything", undefined)` throws an error → caught → 500.

### The fix

Ask for the password **explicitly** when you actually need it (to verify a login):

```js
const user = await User.findOne({ email: normalizedEmail }).select("+password"); // ✅
```

### 🎓 Lesson

Fields marked `select: false` are invisible unless you opt in with `.select("+fieldname")`.

---

## Bug 5 — `.env` variable names didn't match the code

### Where

`BACKEND/.env`

### The buggy file

```
PORT = 5000
MONGO_URI=mongodb+srv://...
JWT_SECRET_KEY=random_secret_key    👈 name mismatch
NODE_ENV= development               👈 stray space
```

### What happened in the app

1. The code reads `process.env.JWT_SECRET`, but `.env` defined `JWT_SECRET_KEY`.
   So the JWT secret was **undefined** → tokens couldn't be signed/verified → auth broken.
2. `NODE_ENV= development` had a leading space, so the value was `" development"`,
   not `"development"`. Every check like `process.env.NODE_ENV !== "development"` became
   `true`, which turned on `secure: true` cookies. Browsers **won't send secure cookies
   over plain http://localhost**, so even a valid login would appear logged-out.

### The fix

```
JWT_SECRET=random_secret_key    ✅ name matches the code
NODE_ENV=development            ✅ no space
```

### 🎓 Lesson

.env names are exact strings — `JWT_SECRET` ≠ `JWT_SECRET_KEY`. And watch out for
invisible spaces around `=`.

---

## Bug 6 — Updating only your profile picture crashed

### Where

`BACKEND/src/controllers/userController.js`, inside `updateProfile`.

### The buggy code

```js
if (username !== undefined) {
    if (typeof username !== "string" || username.trim().length < 3) {
        return res
            .status(400)
            .json({ message: "Username must be at least 3 characters" });
    }
}

updateUser.username = username.trim(); // 👈 runs even when username is undefined 💥

if (profilePicture !== undefined) {
    if (typeof profilePicture !== String) {
        // 👈 same typeof bug as Bug 3
        return res
            .status(400)
            .json({ message: "Profile picture must be a string" });
    }
}
updateUser.profilePicture = profilePicture; // 👈 also runs unconditionally
```

### What happened in the app

Sending `PATCH /api/users/me` with only `{"profilePicture": "http://..."}` crashed with a 500,
because `username.trim()` was called on `undefined`.
And even when it didn't crash, profilePicture updates were always rejected
(same `typeof ... !== String` bug as Bug 3).

### The fix

Only touch a field when the client actually sent it:

```js
if (username !== undefined) {
    if (typeof username !== "string" || username.trim().length < 3) {
        return res
            .status(400)
            .json({ message: "Username must be at least 3 characters" });
    }
    updateUser.username = username.trim(); // ✅ inside the guard
}

if (profilePicture !== undefined) {
    if (typeof profilePicture !== "string") {
        // ✅ quotes added
        return res
            .status(400)
            .json({ message: "Profile picture must be a string" });
    }
    updateUser.profilePicture = profilePicture; // ✅ inside the guard
}
```

### 🎓 Lesson

In "update" endpoints, only modify the fields that were provided — otherwise you
accidentally wipe the ones the client didn't mention.

---

## Bug 7 — Reading messages always crashed (the worst one for a chat app)

### Where

`BACKEND/src/controllers/messageController.js`, inside `getMessages`.

### The buggy code

```js
const messages = (
  await Message.find({ conversation: conversationId }).populate("sender", ...)
)                                  // 👈 await turns the result into a plain ARRAY
  .toSorted({ createdAt: -1 })     // 👈 not how Array.toSorted works 💥
  .skip(skip)                      // 👈 arrays have no .skip() 💥
  .limit(limit);                   // 👈 arrays have no .limit() 💥
```

### What happened in the app

`GET /api/messages/:conversationId` **always** returned 500 "Internal server error".
In other words: you could send chat messages, but you could never read them.
This alone made the whole chat app unusable.

### Why it happened

Two worlds were mixed up:

- **Mongoose Query** (before `await`): has `.sort()`, `.skip()`, `.limit()` — these are
  handled by the database.
- **Plain JavaScript Array** (after `await`): has none of those. And `Array.toSorted()`
  expects a **comparison function**, not a `{ createdAt: -1 }` sort object — so it threw
  a TypeError too.

### The fix

Do the sorting and pagination on the **query**, before awaiting it:

```js
const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "username profilePicture")
    .sort({ createdAt: -1 }) // ✅ newest first
    .skip(skip) // ✅ handled by the database
    .limit(limit); // ✅ handled by the database
```

Bonus: this is also **much faster**, because the database only sends you the 20 messages
you asked for, instead of loading the entire chat into memory first.

### 🎓 Lesson

Chain `.sort/.skip/.limit` **before** `await`. After `await`, you have an Array — and
Array methods work differently from Query methods.

---

## Bug 8 — Missing `return` caused a double response

### Where

`messageController.js`, inside `deleteForEveryone`.

### The buggy code

```js
if (message.isDeleted) {
    res.status(400).json({ message: "Message already deleted" });
    // 👈 no return! The code keeps going...
}

message.isDeleted = true;
// ...
await message.save();
return res.status(200).json({ message: "Message deleted for everyone" }); // 💥 second response
```

### What happened in the app

Deleting an **already deleted** message sent the "already deleted" error, then
_continued_ and tried to send a second response. Express throws
`Cannot set headers after they are sent` — and depending on timing, the client gets a
confusing success response for something that was rejected.

### The fix

```js
if (message.isDeleted) {
    return res.status(400).json({ message: "Message already deleted" }); // ✅ stop here
}
```

### 🎓 Lesson

In Express, **always `return` your response** when a handler can exit early.
A response can only be sent once per request.

---

## ✅ How we verified the fixes

We wrote an end-to-end test script that boots the server, then hits every endpoint
with `curl` and checks the HTTP status codes:

- **Auth**: register, login, logout, wrong password, duplicate email, invalid inputs
- **Users**: get all, get me, update me, search, unauthenticated access (must be 401)
- **Conversations**: create, list
- **Messages**: send, read, mark-as-read, unread count, delete for me, delete for everyone

**Result after the fixes: 30 / 30 tests passing** 🎉

---

## 🧠 The 6 patterns behind all these bugs

If you remember nothing else, remember these — they cause most beginner bugs:

1. **Operator order matters** — `!x.length < 3` is not "not less than 3"; `!` runs first.
2. **`typeof x` returns text** — compare with quotes: `"string"`, never `String`.
3. **Check your env names match** — `JWT_SECRET_KEY` in .env ≠ `process.env.JWT_SECRET`.
4. **`select: false` fields are invisible** — opt in with `.select("+fieldname")`.
5. **Query methods go before `await`** — after `await` you have an Array, not a Query.
6. **`return` every response** — Express responses are one-shot; missing `return` sends two.
