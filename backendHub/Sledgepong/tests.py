from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

from django.apps import apps


class ShopFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='shopper', password='testpass123', coins=20)
        Player = apps.get_model('Sledgepong', 'Player')
        Texture = apps.get_model('Sledgepong', 'Texture')

        self.player = Player.objects.create(user=self.user)
        self.texture = Texture.objects.create(
            name='Test Texture',
            texture_img=SimpleUploadedFile('texture.png', b'filecontent', content_type='image/png'),
        )
        self.client.force_login(self.user)

    def test_shop_buy_view_rejects_get(self):
        response = self.client.get(reverse('buy-texture', args=[self.texture.id]))

        self.assertEqual(response.status_code, 405)

    def test_shop_buy_view_updates_balance_and_collection(self):
        response = self.client.post(reverse('buy-texture', args=[self.texture.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), 'Transaction Successful')

        self.user.refresh_from_db()
        self.player.refresh_from_db()
        self.assertEqual(self.user.coins, 10)
        self.assertIn(self.texture, self.player.collection.all())

    def test_shop_equip_view_only_equips_owned_textures(self):
        response = self.client.post(reverse('equip-texture', args=[self.texture.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), 'Texture Not Owned')

        self.player.collection.add(self.texture)
        response = self.client.post(reverse('equip-texture', args=[self.texture.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), 'Texture Equipped')
        self.player.refresh_from_db()
        self.assertEqual(self.player.curtexture, self.texture)
