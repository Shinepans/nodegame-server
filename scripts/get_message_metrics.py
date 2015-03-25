#!/usr/bin/env python
import sys
import json
from collections import Counter


def main():
    if len(sys.argv) != 2:
        print "Usage: {0} /path/to/messages.log".format(sys.argv[0])
        return

    cnt = Counter()
    sent_target = Counter()
    resent_target = Counter()
    sent_msgs = {}

    with open(sys.argv[1]) as messages:
        for message in messages:
            winstonMsg = json.loads(message)
            gameMsg = json.loads(winstonMsg["message"])

            is_sent = gameMsg["to"] != "SERVER"
            if is_sent:
                cnt["sent"] += 1
                sent_target[gameMsg["target"]] += 1

                msgId, ts = gameMsg["id"], gameMsg["created"]
                if msgId in sent_msgs and ts not in sent_msgs[msgId]:
                    cnt["resent"] += 1
                    resent_target[gameMsg["id"]] += 1
                    sent_msgs[msgId].add(ts)
                elif msgId not in sent_msgs:
                    sent_msgs[msgId] = set([ts])

    print cnt
    print sent_target
    print resent_target.most_common(5)

if __name__ == '__main__':
    main()
