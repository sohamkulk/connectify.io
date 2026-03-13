import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Share2, Search, Send, Smile, Paperclip,
  LogOut, X, Phone, Video, MoreVertical, ArrowLeft
} from "lucide-react";
import api from "../api/axios";


const BACKEND = import.meta.env.VITE_API_URL ?? "http://localhost:5000";


const isSame = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

function Chat() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showEmojiBox, setShowEmojiBox] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);
  const currentUserRef = useRef(null);
  const socket = useRef(null);

  const emojis = [
    "😀", "😂", "😍", "🥰", "😎", "😢", "😡", "👍", "👎", "❤️",
    "🔥", "🎉", "🙏", "😭", "🤔", "😴", "🥳", "😇", "🤩", "😏",
    "👋", "💪", "🎊", "✨", "💯", "🙌", "😬", "🤯", "😱", "🥺"
  ];

  
  useEffect(() => {
    socket.current = io(BACKEND, { withCredentials: true });

    socket.current.on("connect", () => {
      if (currentUserRef.current) {
        socket.current.emit("userOnline", currentUserRef.current._id);
      }
    });

    socket.current.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.current.on("receiveMessage", (message) => {
      if (
        selectedUserRef.current &&
        isSame(message.sender, selectedUserRef.current._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.current.on("typing", ({ senderId }) => {
      if (isSame(senderId, selectedUserRef.current?._id)) {
        setIsTyping(true);
      }
    });

    socket.current.on("stopTyping", ({ senderId }) => {
      if (isSame(senderId, selectedUserRef.current?._id)) {
        setIsTyping(false);
      }
    });

    socket.current.on("messageEdited", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => m._id === updatedMsg._id ? updatedMsg : m)
      );
    });

    socket.current.on("messageDeleted", (messageId) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    const parsed = JSON.parse(user);
    setCurrentUser(parsed);
    currentUserRef.current = parsed;
    if (socket.current?.connected) {
      socket.current.emit("userOnline", parsed._id);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const { data } = await api.get(`/messages/${userId}`);
      setMessages(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    selectedUserRef.current = user;
    fetchMessages(user._id);
    setShowEmojiBox(false);
    setShowChat(true);
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const { data } = await api.post("/messages/send", {
        receiverId: selectedUser._id,
        message: newMessage,
      });
      setMessages((prev) => [...prev, data]);
      socket.current.emit("sendMessage", {
        ...data,
        receiver: selectedUser._id
      });
      socket.current.emit("stopTyping", {
        senderId: currentUserRef.current._id,
        receiverId: selectedUserRef.current._id
      });
      setNewMessage("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!selectedUserRef.current || !currentUserRef.current) return;
    socket.current.emit("typing", {
      senderId: currentUserRef.current._id,
      receiverId: selectedUserRef.current._id
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.current.emit("stopTyping", {
        senderId: currentUserRef.current._id,
        receiverId: selectedUserRef.current._id
      });
    }, 3000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log(error);
    }
    
    if (socket.current && currentUserRef.current) {
      socket.current.emit("userOffline", currentUserRef.current._id);
      socket.current.disconnect();
    }
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleEditMessage = async (msg) => {
    const newText = prompt("Edit your message:", msg.message);
    if (!newText || newText === msg.message) return;
    try {
      const { data } = await api.put(`/messages/${msg._id}`, { message: newText });
      setMessages((prev) => prev.map((m) => m._id === msg._id ? data : m));
      socket.current.emit("editMessage", { ...data, receiver: selectedUserRef.current._id });
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      socket.current.emit("deleteMessage", {
        messageId: msgId,
        receiverId: selectedUserRef.current._id
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (createdAt) => {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const timeStr = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });
    if (date.toDateString() === today.toDateString()) {
      return `Today · ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday · ${timeStr}`;
    } else {
      return `${date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata"
      })} · ${timeStr}`;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">

      {/* NAVBAR */}
      <div className="h-14 bg-gray-800 flex items-center justify-between px-4 md:px-6 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Share2 className="text-gray-300" size={22} />
          <h1 className="text-white text-lg font-bold tracking-wide">Connectify.io</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 transition px-3 py-1.5 rounded-full"
          >
            {currentUser?.image ? (
              <img src={`${BACKEND}${currentUser.image}`} alt="profile" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-xs">
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-gray-200 text-sm font-medium hidden md:block">{currentUser?.name}</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="bg-gray-800 p-5 flex flex-col items-center relative">
                <button onClick={() => setShowProfile(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
                {currentUser?.image ? (
                  <img src={`${BACKEND}${currentUser.image}`} alt="profile" className="w-16 h-16 rounded-full object-cover border-2 border-gray-500" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-2xl">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-white font-bold mt-2">{currentUser?.name}</h2>
                <p className="text-gray-400 text-sm">{currentUser?.email}</p>
              </div>
              <div className="p-4 bg-gray-50">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl transition text-sm">
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className={`${showChat ? "hidden" : "flex"} md:flex w-full md:w-80 bg-gray-200 border-r border-gray-300 flex-col shrink-0`}>
          <div className="p-4 border-b border-gray-300">
            <h2 className="font-bold text-gray-700 text-base mb-3">Messages</h2>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-10">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-300 transition border-b border-gray-300 ${selectedUser?._id === user._id ? "bg-gray-300 border-l-4 border-l-gray-600" : ""}`}
                >
                  <div className="relative shrink-0">
                    {user.image ? (
                      <img
                        src={`${BACKEND}${user.image}`}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover cursor-pointer ring-2 ring-transparent hover:ring-gray-500 transition"
                        onClick={(e) => { e.stopPropagation(); setSelectedProfile(user); }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold cursor-pointer hover:ring-2 hover:ring-gray-600 transition"
                        onClick={(e) => { e.stopPropagation(); setSelectedProfile(user); }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-200 ${onlineUsers.includes(user._id) ? "bg-green-500" : "bg-red-400"}`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{onlineUsers.includes(user._id) ? "Online" : "Offline"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT CHAT SECTION */}
        <div className={`${!showChat ? "hidden" : "flex"} md:flex flex-1 flex-col bg-gray-50`}>
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <Share2 size={36} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-600">Welcome to Connectify.io</h2>
              <p className="text-gray-400 text-sm text-center">Select a user from the left to start chatting 💬</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowChat(false)} className="md:hidden text-gray-500 hover:text-gray-700 mr-1">
                    <ArrowLeft size={20} />
                  </button>
                  {selectedUser.image ? (
                    <img
                      src={`${BACKEND}${selectedUser.image}`}
                      alt={selectedUser.name}
                      className="w-9 h-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-gray-400 transition"
                      onClick={() => setSelectedProfile(selectedUser)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm cursor-pointer" onClick={() => setSelectedProfile(selectedUser)}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{selectedUser.name}</p>
                    {isTyping ? (
                      <p className="text-xs text-indigo-500 italic animate-pulse">typing...</p>
                    ) : (
                      <p className={`text-xs ${onlineUsers.includes(selectedUser._id) ? "text-green-500" : "text-gray-400"}`}>
                        {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <button className="hover:text-gray-600 transition"><Phone size={17} /></button>
                  <button className="hover:text-gray-600 transition"><Video size={17} /></button>
                  <button className="hover:text-gray-600 transition"><MoreVertical size={17} /></button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-sm">No messages yet. Say Hi! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMyMessage = isSame(msg.sender, currentUser?._id);
                    return (
                      <div key={index} className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}>
                        <div
                          onDoubleClick={() => {
                            if (isMyMessage) setContextMenu({ msgId: msg._id, msg });
                          }}
                          className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm cursor-pointer select-none ${isMyMessage ? "bg-gray-700 text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border border-gray-200"}`}
                        >
                          {msg.message}
                          {msg.edited && <span className="text-xs italic ml-1 opacity-60">edited</span>}
                          <div className="text-xs mt-1 opacity-60">{formatMessageTime(msg.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Emoji Picker */}
              {showEmojiBox && (
                <div className="px-4 pb-2">
                  <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-md flex flex-wrap gap-1.5">
                    {emojis.map((emoji, i) => (
                      <button key={i} onClick={() => handleEmojiClick(emoji)} className="text-xl hover:scale-125 transition">{emoji}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 bg-white border-t border-gray-200 shrink-0">
                <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
                  <button onClick={() => setShowEmojiBox(!showEmojiBox)} className="text-gray-400 hover:text-gray-600 transition shrink-0">
                    <Smile size={21} />
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 font-medium placeholder-gray-400 min-w-0"
                  />
                  <button className="text-gray-400 hover:text-gray-600 transition shrink-0">
                    <Paperclip size={21} />
                  </button>
                  <button onClick={handleSendMessage} className="bg-gray-700 hover:bg-gray-800 text-white p-2 rounded-xl transition shrink-0">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* EDIT/DELETE CONTEXT MENU */}
      {contextMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setContextMenu(null)}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-56" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-gray-400 px-4 pt-3 pb-1 font-medium uppercase tracking-wider">Message Options</p>
            <button onClick={() => { handleEditMessage(contextMenu.msg); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
              ✏️ Edit Message
            </button>
            <div className="border-t border-gray-100" />
            <button onClick={() => { handleDeleteMessage(contextMenu.msgId); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition">
              🗑️ Delete for Everyone
            </button>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-800 p-6 flex flex-col items-center relative">
              <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
              </button>
              {selectedProfile.image ? (
                <img src={`${BACKEND}${selectedProfile.image}`} alt={selectedProfile.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-600" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-4xl">
                  {selectedProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-white font-bold text-xl mt-3">{selectedProfile.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{selectedProfile.email}</p>
              <span className={`mt-2 text-xs px-3 py-1 rounded-full ${onlineUsers.includes(selectedProfile._id) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {onlineUsers.includes(selectedProfile._id) ? "● Online" : "● Offline"}
              </span>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center">
              <button onClick={() => { handleSelectUser(selectedProfile); setSelectedProfile(null); }} className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-2 rounded-xl text-sm transition">
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;