async function getMyIpAddress(cidrSuffix: string = '/32'): Promise<string | null> {
    try {
        const res = await fetch('https://api.ipify.org');
        if (res.ok) {
            const ipAddress = await res.text();
            const trimmedIp = ipAddress.trim();
            
            // IP 주소 유효성 검사 (간단한 정규식)
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            
            if (ipRegex.test(trimmedIp)) {
                return `${trimmedIp}${cidrSuffix}`;
            } else {
                console.error('Invalid IP address format received:', trimmedIp);
                return null;
            }
        } else {
            console.error('Failed to fetch IP address:', res.status, res.statusText);
            return null;
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error('Error fetching IP address:', err.message);
        }
        return null;
    }
}

export default getMyIpAddress;
