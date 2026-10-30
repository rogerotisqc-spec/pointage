#!/usr/bin/env python3
"""Aligne un APK (zipalign 4 octets) et le signe avec le schéma APK v2 (RSA-2048 / SHA-256).

Usage : sign_apk.py entree.apk sortie.apk cle.pem cert.der
Si cle.pem / cert.der n'existent pas, ils sont créés (gardez-les : ils sont
nécessaires pour installer les mises à jour par-dessus l'app existante).
"""
import hashlib, os, struct, sys, zipfile, datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

STORED_EXT = ('.arsc', '.png', '.so')


def ensure_key(key_path, cert_path):
    if os.path.exists(key_path) and os.path.exists(cert_path):
        key = serialization.load_pem_private_key(open(key_path, 'rb').read(), None)
        return key, open(cert_path, 'rb').read()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Pointage'),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Famille'),
                      x509.NameAttribute(NameOID.COUNTRY_NAME, 'CA')])
    now = datetime.datetime(2026, 1, 1)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now).not_valid_after(now + datetime.timedelta(days=365 * 40))
            .sign(key, hashes.SHA256()))
    open(key_path, 'wb').write(key.private_bytes(serialization.Encoding.PEM,
                                                 serialization.PrivateFormat.PKCS8,
                                                 serialization.NoEncryption()))
    der = cert.public_bytes(serialization.Encoding.DER)
    open(cert_path, 'wb').write(der)
    return key, der


def align(src, dst):
    zin = zipfile.ZipFile(src)
    with open(dst, 'wb') as f:
        zout = zipfile.ZipFile(f, 'w')
        for info in zin.infolist():
            data = zin.read(info.filename)
            ni = zipfile.ZipInfo(info.filename, date_time=(2026, 1, 1, 0, 0, 0))
            ni.external_attr = info.external_attr
            stored = info.filename.endswith(STORED_EXT) or info.filename == 'resources.arsc'
            ni.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
            if stored:
                offset = f.tell() + 30 + len(info.filename.encode())
                pad = (4 - offset % 4) % 4
                ni.extra = b'\0' * pad
            zout.writestr(ni, data)
        zout.close()


def lp(b):
    return struct.pack('<I', len(b)) + b


def sign(apk_path, out_path, key, cert_der):
    data = open(apk_path, 'rb').read()
    eocd = data.rfind(b'PK\x05\x06')
    cd_size, cd_off = struct.unpack('<II', data[eocd + 12:eocd + 20])
    sections = [data[:cd_off], data[cd_off:cd_off + cd_size], data[eocd:]]
    chunks = []
    for sec in sections:
        for i in range(0, len(sec), 1 << 20):
            c = sec[i:i + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()
    ALG = 0x0103  # RSASSA-PKCS1-v1_5 avec SHA2-256
    digests = lp(lp(struct.pack('<I', ALG) + lp(digest)))
    certs = lp(lp(cert_der))
    signed_data = digests + certs + lp(b'')
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    pub = key.public_key().public_bytes(serialization.Encoding.DER,
                                        serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed_data) + lp(lp(struct.pack('<I', ALG) + lp(sig))) + lp(pub)
    v2 = lp(lp(signer))
    pair = struct.pack('<Q', 4 + len(v2)) + struct.pack('<I', 0x7109871a) + v2
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + b'APK Sig Block 42'
    new_eocd = bytearray(data[eocd:])
    struct.pack_into('<I', new_eocd, 16, cd_off + len(block))
    open(out_path, 'wb').write(data[:cd_off] + block + data[cd_off:cd_off + cd_size] + bytes(new_eocd))


if __name__ == '__main__':
    src, out, key_path, cert_path = sys.argv[1:5]
    key, cert = ensure_key(key_path, cert_path)
    tmp = out + '.aligned'
    align(src, tmp)
    sign(tmp, out, key, cert)
    os.remove(tmp)
    print('APK signé :', out)
