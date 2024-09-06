document.addEventListener("DOMContentLoaded", function () {
  // let socket = io("ws://localhost:5001");
  // socket.on("connect_error", (err) => {
  //   console.log("socket error", err.message); // prints the message associated with the error
  //   throw new Error(err.message);
  // });

  const baseurl = "http://localhost:5001";
  let authToken = "";
  let currentRoom = "";
  let groups = [];
  let userEmail = "";
  let userId = "";
  let groupsPagination = { page: 0, limit: 20, next: true };

  const loginForm = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const roomForm = document.getElementById("roomForm");
  const roomInput = document.getElementById("roomInput");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  const messages = document.getElementById("messages");
  const groupList = document.getElementById("groupList");
  const groupListContainer = document.getElementById("groupListContainer");

  loginForm.addEventListener("submit", handleLogin);

  function handleLogin(event) {
    event.preventDefault();
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
      email: email.value,
      password: password.value,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    fetch(`${baseurl}/auth/signin`, requestOptions)
      .then((response) => response.text())
      .then((result) => {
        result = JSON.parse(result);

        authToken = result?.data?.token;
        userEmail = result.data.user.email;
        userId = result.data.user._id;
        instantiateSocketIOAndDependencies(authToken, userEmail, userId);

        document.getElementById(
          "userInfo"
        ).textContent = `${result.data.user.username} - ${result.data.user.email}`;
        getGroups(groupsPagination.page + 1, groupsPagination.limit, authToken);
        loginForm.style.display = "none";
        groupListContainer.style.display = "block";
        console.log(groups);
      })
      .catch((error) => console.error(error));
  }

  function getGroups(page = 1, limit = 20, token) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${token}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    fetch(`${baseurl}/api/groups?page=${page}&limit=${limit}`, requestOptions)
      .then((response) => response.text())
      .then((result) => {
        result = JSON.parse(result);
        groups = [...result?.data, ...groups];
        updateGroupList(groups);
        groupsPagination = {
          page: page,
          limit: 20,
          next: result?.pagination?.totalPages > page,
        };
      })
      .catch((error) => console.error(error));
  }

  function updateGroupList(groups) {
    groupList.innerHTML = "";
    groups.forEach((group) => {
      const item = document.createElement("li");
      item.innerHTML = `<a href="#" id="${group._id}" class="groupClass">${group.groupName} - ${group.service}</a>`;
      groupList.appendChild(item);
    });
  }
});

function instantiateSocketIOAndDependencies(token, userEmail, userId) {
  let currentRoom = "";
  // socket actions
  const socket = io("ws://localhost:5001", {
    auth: { token },
  });

  socket.on("connect_error", (err) => {
    console.log("socket error", err.message); // prints the message associated with the error
    throw new Error(err.message);
  });

  const roomForm = document.getElementById("roomForm");
  const roomInput = document.getElementById("roomInput");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  const messages = document.getElementById("messages");

  let msgPagination = { nextCursor: null, limit: 20 };

  roomForm.addEventListener("submit", handleRoomJoin);
  messageForm.addEventListener("submit", handleMessageSend);

  socket.on("chat-message", ({ messages: msg, user }) => {
    const item = document.createElement("li");
    item.setAttribute("id", msg._id);

    // Use sender's username or email
    item.innerHTML = `${user.username}: ${msg.content}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    setCursor();
  });

  socket.on(`messages-${userId}`, ({ messages: msgs, nextCursor, user }) => {
    for (const msg of msgs ?? []) {
      const item = document.createElement("li");
      item.setAttribute("id", msg._id);
      console.log(msg);
      item.innerHTML = `${msg.sender.email}: ${msg.content}`;
      messages.insertBefore(item, messages.firstChild);
      window.scrollTo(0, document.body.scrollHeight);

      msgPagination.nextCursor = nextCursor;
    }
    setCursor();
  });

  function handleRoomJoin(event) {
    event.preventDefault();
    if (roomInput.value) {
      currentRoom = roomInput.value;
      socket.emit("join-group-chat", currentRoom);
      roomForm.style.display = "none";
      messageForm.style.display = "block";
      sendGetMessagesEvent(currentRoom);
    }
  }

  function sendGetMessagesEvent(room) {
    socket.emit("get-messages", {
      room,
      limit: msgPagination.limit,
      cursor: msgPagination.nextCursor,
    });
  }

  function handleMessageSend(event) {
    event.preventDefault();
    if (messageInput.value) {
      socket.emit("send-message", {
        room: currentRoom,
        msg: messageInput.value,
      });
      messageInput.value = "";
    }
  }

  // Attach the event listener to the parent element
  document
    .getElementById("groupList")
    .addEventListener("click", handleGroupListClick);
  function handleGroupListClick(event) {
    if (event.target && event.target.matches(".groupClass")) {
      currentRoom = event.target.id;
      socket.emit("join-group-chat", currentRoom);
      groupListContainer.style.display = "none";
      messageForm.style.display = "block";
      sendGetMessagesEvent(currentRoom);
    }
  }

  function setCursor() {
    const messages = document.getElementById("messages");
    const firstChild = messages.firstElementChild;

    const firstChildId = firstChild ? firstChild.id : null;
    msgPagination.nextCursor = firstChildId;
  }
}
