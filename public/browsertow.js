// document.addEventListener('click', function (event) {

//     if (event.target.classList.contains('submit_form')) {
//         event.preventDefault(); 

//         const name = document.getElementById('submit_name').value;
//         const username = document.getElementById('submit_email').value;
//         const email = document.getElementById('submit_username').value;
//         const password = document.getElementById('submit_password').value;

//         console.log(name, username, email, password)
//         axios
//             .post('/register', { name, email, username, password })
//             .then((res) => {
//                 document.getElementsByClassName('.').value = '';
//                 alert('register successfuly')
//                 return;
//             })
//             .catch(() => {
//                 if (err.response.status !== 500) {
//                     alert(err.response.data);
//                 }
//             });
//     }
// });

document.addEventListener('click', function (event) {
    if (event.target.classList.contains('submit_form')) {
        event.preventDefault(); 

        const name = document.getElementById('submit_name').value;
        const email = document.getElementById('submit_email').value;
        const username = document.getElementById('submit_username').value;
        const password = document.getElementById('submit_password').value;

        //console.log(name, username, email, password);
        
        axios
            .post('/register', { name, email, username, password })
            .then((res) => {
                // Clear all input fields with class submit_field
                document.querySelectorAll('.submit_field').forEach(input => {
                    input.value = '';
                });
                alert('Registered successfully');
                window.location.href = '/login';
            })
            .catch((err) => {
                if (err.response && err.response.status !== 500) {
                    alert(err.response.data);
                } else {
                    alert('Internal server error');
                }
            });
    }

    if (event.target.classList.contains('button1')) {
        window.location.href = '/login';
    }

    if (event.target.classList.contains('login_form')) {
        event.preventDefault(); 

        const loginId = document.getElementById('login_field').value;
        const password = document.getElementById('password_field').value;

        axios
        .post('/login', {loginId, password})
        .then((res) => {
            document.querySelectorAll('.submit_field').forEach(input => {
                input.value = '';
            });
            alert('login successfully');
            window.location.href = '/dashboard';
        })
        .catch((err) => {
            if (err.response && err.response.status !== 500) {
                alert(err.response.data);
            } else {
                alert('Internal server error');
            }
        })
    }

    if (event.target.classList.contains('button2')) {
        window.location.href = '/register';
    }
});
