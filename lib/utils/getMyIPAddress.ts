async function getMyIpAddress() {
    try {
        const res = await fetch('https://api.ipify.org');
        if (res.ok) {
            const body = await res.text();
            return body.trim();
        } else {
            return null;
        }
    } catch(err) {
        if (err instanceof Error) {
            console.error(err.message);
        }
        return null;
    }
};

const main = async () => console.log(await getMyIpAddress())
main();

export default getMyIpAddress;