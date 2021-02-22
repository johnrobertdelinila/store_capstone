import {MDCRipple} from '@material/ripple';
import {MDCTextField} from '@material/textfield';
import {MDCDialog} from '@material/dialog';
import $ from "jquery";
import {MDCSnackbar} from '@material/snackbar';
import swal from 'sweetalert';

const username = new MDCTextField(document.querySelector('.username'));
const password = new MDCTextField(document.querySelector('.password'));
const email = new MDCTextField(document.querySelector('.email'));
const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));

const dialog_forgot = new MDCDialog(document.querySelector('.dialog-forgot'));

new MDCRipple(document.querySelector('.cancel'));
new MDCRipple(document.querySelector('.next'));
new MDCRipple(document.querySelector('.register'));

const textFieldElements = [].slice.call(document.querySelectorAll('.mdc-text-field'));
textFieldElements.forEach((textFieldEl) => {
  new MDCTextField(textFieldEl);
});

$(document).ready(() => {
	// Firebase init
	try {
		let app = firebase.app();
		let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
		console.log(`Firebase SDK loaded with ${features.join(', ')}`);
	} catch (e) {
		console.error(e);
		console.log('Error loading the Firebase SDK, check the console.');
	 	setTimeout(() => {
	 		// window.location.reload();
	 	}, 500);
	}

	const auth = firebase.auth();
	const functions = firebase.functions();

	// Cloud Functions
	const insertNewUser = functions.httpsCallable("insertNewUser");

	auth.onAuthStateChanged((user) => {
		if (user) {
			window.location.href = 'home.html';
		}
	});

	$('#login-form').submit((e) => {
		e.preventDefault();
		snackbar.labelText = 'One moment. Signing you in...';
		/*if (!snackbar.isOpen) {
			snackbar.open();
		}else {
			snackbar.close();
			snackbar.open();
		}*/

		$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
		$('.next').prop('disabled', true);
		const that = e.currentTarget;

		var values = {};
		$.each($(e.currentTarget).serializeArray(), (i, field) => {
	    	values[field.name] = field.value;
		});

		console.log('Signing in...');

		auth.signInWithEmailAndPassword(values.username, values.password)
			.then(() => {
				if (snackbar.isOpen) {
					snackbar.close();
				}
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				$('.next').prop('disabled', false);
				$(that).off("submit"); // to guarante the function won't be invoked
		        that.submit(); // submit the form
		        return null;
			})
			.catch(err =>{
				if (snackbar.isOpen) {
					snackbar.close();
				}
				snackbar.labelText = err.message;
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				$('.next').prop('disabled', false);
				if (!snackbar.isOpen) {
					snackbar.open();
				}
			});

	});

	$('#button-forgot').click(() => {
		email.value = '';
		dialog_forgot.open();
	});

	$('#submit-email').click(() => {
		$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
		const emailAddress = email.value.trim();
		auth.sendPasswordResetEmail(emailAddress)
			.then(() => {
				snackbar.labelText = 'We sent a password reset email to ' + emailAddress;
				if (!snackbar.isOpen) {
					snackbar.open();
				}
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				return null;
			})
			.catch((e) => {
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				snackbar.labelText = e.message;
				if (!snackbar.isOpen) {
					snackbar.open();
				}
			});
	});
	$('#reset-form').submit((e) => {
		e.preventDefault();
		$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
		const emailAddress = email.value.trim();
		auth.sendPasswordResetEmail(emailAddress)
			.then(() => {
				dialog_forgot.close();
				snackbar.labelText = 'We sent a password reset email to ' + emailAddress;
				if (!snackbar.isOpen) {
					snackbar.open();
				}
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				return null;
			})
			.catch((e) => {
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				snackbar.labelText = e.message;
				if (!snackbar.isOpen) {
					snackbar.open();
				}
			});
	});

	$('#button-register').click((e) => {
		const action = $(e.currentTarget).text().trim().toLowerCase();
		if (action === 'register') {
			$('#login-form').hide();
			$('#register-form').show();
			$(e.currentTarget).text('LOGIN');
			$('#action-text').text('SIGN UP');
		}else {
			$('#register-form').hide();
			$('#login-form').show();
			$(e.currentTarget).text('REGISTER');
			$('#action-text').text('SIGN IN');
		}
		resetInput('#login-form');
		resetInput('#register-form');
		
	});

	function resetInput(form) {
		$(form).trigger('reset');
		$('.mdc-text-field').find('div:first').removeClass('mdc-notched-outline--notched');
		$('.mdc-text-field').removeClass('mdc-text-field--invalid');
		$('.mdc-floating-label').removeClass('mdc-floating-label--float-above');
		$('.mdc-notched-outline__notch').removeAttr("style");
	}

	$('#register-form').submit((e) => {

		e.preventDefault();
				
		var values = {};
		$.each($(e.currentTarget).serializeArray(), (i, field) => {
	    	values[field.name] = field.value;
		});

		if (values.confirm.trim() !== values.password.trim()) {
			swal("Password does not match!");
			return false;
		}
		values.userType = 'owner';
		$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
		$('#submit-user').prop('disabled', true);
		return insertNewUser(values)
			.then(result => {
				if (result.data) {
					swal({
						title: "Good Job!",
						text: "New store owner has been added successfully.",
						icon: "success",
						button: "INSERTED",
					});
					resetInput('#register-form');
				}else {
					swal({
						title: "Failed",
						text: "Sorry but adding new store owner cannot done at this moment. Please try again later.",
						icon: "error",
						button: "OKAY",
					});
				}
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				$('#submit-user').prop('disabled', false);
				return null;
			})
			.catch(error => {
				swal({
					title: "Failed",
					text: error.message,
					icon: "error",
					button: "DONE",
				});
				$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
				$('#submit-user').prop('disabled', false);
			});

	});

});
