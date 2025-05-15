import threading


class Timer:
    def __init__(self):
        self.timers = {}
        self.timer_id = 0

    def set_interval(self, fn, time, *args):
        def interval_callback():
            fn(*args)
            if timer_id in self.timers:
                self.timers[timer_id] = threading.Timer(time / 1000, interval_callback)
                self.timers[timer_id].start()

        timer_id = self.timer_id
        self.timer_id += 1
        self.timers[timer_id] = threading.Timer(time / 1000, interval_callback)
        self.timers[timer_id].start()
        return timer_id

    def clear_interval(self, timer_id):
        if timer_id in self.timers:
            self.timers[timer_id].cancel()
            del self.timers[timer_id]

    def set_timeout(self, fn, delay, *args, **kwargs):
        def timer_callback():
            self.timers.pop(timer_id, None)
            fn(*args, **kwargs)

        timer_id = self.timer_id
        self.timer_id += 1
        t = threading.Timer(delay / 1000, timer_callback)
        self.timers[timer_id] = t
        t.start()
        return timer_id

    def clear_timeout(self, timer_id):
        t = self.timers.pop(timer_id, None)
        if t is not None:
            t.cancel()
