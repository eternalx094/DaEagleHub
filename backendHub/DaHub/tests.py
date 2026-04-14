from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class AuthFlowTests(TestCase):
    def test_signup_creates_user_and_redirects(self):
        response = self.client.post(reverse('signup'), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password1': 'ComplexPass123!',
            'password2': 'ComplexPass123!',
        })

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('profile_view'))
        self.assertTrue(get_user_model().objects.filter(username='newuser').exists())

    def test_user_login_success_redirects_to_hub(self):
        get_user_model().objects.create_user(username='loginuser', password='LoginPass123!')

        response = self.client.post(reverse('user_login'), {
            'username': 'loginuser',
            'password': 'LoginPass123!',
        })

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('hub_view'))

    def test_user_login_invalid_credentials_stays_on_login_page(self):
        response = self.client.post(reverse('user_login'), {
            'username': 'missing',
            'password': 'wrongpass',
        })

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Login')
