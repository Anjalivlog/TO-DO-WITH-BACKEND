
function displayDate() {
    let date = new Date()
    date = date.toString().split(" ")
    date = date[1] + " " + date[2] + " " + date[3]
    document.querySelector("#date").innerHTML = date
}

let skip = 0

function generateTodos() {
    axios
        .get(`/read-item?skip=${skip}`)
        .then((res) => {
            if (res.data.status !== 200) {
                alert(res.data.message);
                return;
            }
            
            const todos = res.data.data;
            // <textarea disabled>${item.todo}</textarea>
            //console.log(todos);
            skip += todos.length;
            document.getElementById('item_list').insertAdjacentHTML('beforeend',
                todos.map((item) => {
                    return `<li class="item">
                    <div class='input-controller'>
                        <span class='textarea'>${item.todo}</span>
                        <div class='edit-controller'>
                            <i data-id='${item._id}' class="fa-solid fa-check deleteBtn"></i>
                            <i data-id='${item._id}' class="fa-solid fa-pen-to-square editBtn"></i>
                        <div>
                    </div>
                    </li>` }).join('')
            );
        })
        .catch((err) => {
            console.log(err);
        });
}

document.addEventListener('click', function (event) {
    //edit
    if (event.target.classList.contains('editBtn')) {
        const newData = prompt('Enter new Todo Text');
        const todoId = event.target.getAttribute('data-id');
        console.log(newData, todoId);

        axios
            .post('/edit-item', { newData, todoId })
            .then((res) => {
                if (res.data.status !== 200) {
                    alert(res.data.message);
                    return;
                }
                event.target.parentElement.parentElement.querySelector('.textarea').innerHTML = newData;
            })
            .catch((err) => console.log(err));
    }
    //delete
    else if (event.target.classList.contains('deleteBtn')) {
        const todoId = event.target.getAttribute('data-id');

        axios
            .post('/delete-item', { todoId })
            .then((res) => {
                if (res.data.status !== 200) {
                    alert(res.data.message);
                    return;
                }
                event.target.parentElement.parentElement.parentElement.remove();
            })
            .catch((err) => console.log(err));
    }
    //create
    else if (event.target.classList.contains('add_item')) {
        const todo = document.getElementById('create_field').value;

        axios
            .post('/create-item', { todo })
            .then((res) => {
                document.getElementById('create_field').value = '';
                const todo = res.data.data.todo;
                const todoId = res.data.data._id;

                document
                    .getElementById('item_list')
                    .insertAdjacentHTML('beforeend',
                        `<li class="item">
                        <div class='input-controller'>
                            <span class='textarea'>${todo}</span>
                            <div class='edit-controller'>
                                <i data-id='${todoId}' class="fa-solid fa-check deleteBtn"></i>
                                <i data-id='${todoId}' class="fa-solid fa-pen-to-square editBtn"></i>
                            <div>
                        </div>
                        </li>` ).join('')
            })
            .catch((err) => {
                if (err.response && err.response.status !== 500) {
                    alert(err.response.data);
                }
            });
    }
    //show mre
    else if (event.target.classList.contains('show_more')) {
        generateTodos();
    }

    else if (event.target.classList.contains('logout_button')) {

        axios
        .post('/logout')
        .then((res) => {
            alert(res.data);
            window.location.href = '/login';
        })
        .catch((err) => {
            if (err.response && err.response.status !== 500) {
                alert(err.data);
            }
        });
        
    }
});


window.onload = function () {
    displayDate(),
        generateTodos()
};