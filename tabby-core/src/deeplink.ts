import { Injectable } from '@angular/core'
import { DeeplinkHandler } from './api/deeplink'
import { ProfilesService } from './services/profiles.service'

@Injectable()
export class DefaultDeeplinkHandler extends DeeplinkHandler {

    constructor (
        private profiles: ProfilesService,
    ) {
        super()
    }

    handle (url: string): void {

        const deeplinkUrl = new URL(url);
        const pathname = deeplinkUrl.pathname;
        const token = pathname.slice(2).split(":");
        if (token.length < 2) {
            return;
        }
        const host = token[0];
        const port = parseInt(token[1]);
        const type = deeplinkUrl.searchParams.get("type") ?? 'ssh';
        const options = {
            host,
            port,
            algorithms: {
                key: [
                    "curve25519-sha256",
                    "curve25519-sha256@libssh.org",
                    "diffie-hellman-group-exchange-sha256",
                    "diffie-hellman-group1-sha1",
                    "diffie-hellman-group14-sha256",
                    "diffie-hellman-group15-sha512",
                    "diffie-hellman-group16-sha512",
                    "diffie-hellman-group17-sha512",
                    "diffie-hellman-group18-sha512",
                    "ecdh-sha2-nistp256",
                    "ecdh-sha2-nistp384",
                    "ecdh-sha2-nistp521"
                ]
            },
        }

        const u = deeplinkUrl.searchParams.get("u");
        if (u) {
            options['user'] = Buffer.from(u, 'base64').toString();
            const p = deeplinkUrl.searchParams.get("p");
            if (p) {
                options['auth'] = 'password';
                options['password'] =  Buffer.from(p, 'base64').toString();
            }
        }

        const profile = {
            id: `${type}:deeplink`,
            type,
            name: `${host}:${port}`,
            icon: 'fas fa-desktop',
            options,
            isBuiltin: true,
            isTemplate: true,
            weight: -1,
        }
        this.profiles.openNewTabForProfile(profile)
    }
}
