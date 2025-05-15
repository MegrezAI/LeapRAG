from Crypto.PublicKey import RSA


def generate_key_pair(tenant_id):
    private_key = RSA.generate(2048)
    public_key = private_key.publickey()

    pem_private = private_key.export_key()
    pem_public = public_key.export_key()

    return (pem_public.decode(), pem_private.decode())
